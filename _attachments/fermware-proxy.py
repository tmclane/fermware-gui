'''
This script is automatically started and managed by CouchDB itself.

'''
from urlparse import (
    parse_qs,
    urlparse
)
import BaseHTTPServer
import SimpleHTTPServer
import json
import logging
import select
import serial
import sys
import threading
import time

_running = True

DB_NAME = 'fermentator'


class FermwareTTY(object):
    def __init__(self, tty, baudrate):
        self.tty = tty
        self.baudrate = baudrate
        self.serial = None
        self.tty_lock = threading.Lock()
        self.__connected = False
        self.connect()

    def connect(self):
        if not self.__connected:
            self.serial = serial.Serial(self.tty, int(self.baudrate), timeout=1)
            try:
                self.serial.open()
                time.sleep(4)
            except serial.SerialException, e:
                logging.error("Could not open serial port %s: %s" % (self.serial.portstr, e))
                sys.exit(1)
            else:
                self.send_receive("Good morning fermware")

            self.__connected = True

    def send_receive(self, message):
        '''
        Submits the entire message and the listens for the response

        '''
        with self.tty_lock:
            self.serial.write('%s\n' % message)
            return self.serial.readline()


class Handler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def __parse_url(self):
        pr = urlparse(self.path)
        return (pr.path.strip('/'), parse_qs(pr.query))

    def do_GET(self):
        path, qs = self.__parse_url()
        if path:
            method = 'get_' + path
            if hasattr(self, method):
                getattr(self, method)(path, qs)
                return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        path, qs = self.__parse_url()
        if path:
            method = 'put_' + path
            if hasattr(self, method):
                getattr(self, method)(path, qs)
                return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        path, qs = self.__parse_url()
        if path:
            method = 'put_' + path
            if hasattr(self, method):
                getattr(self, method)(path, qs)
                return

        self.send_response(404)
        self.end_headers()

    def get_sensors(self, path, qs):
        self.send_response(200)
        self.end_headers()
        data = self.server.connection.send_receive("list_sensors")
        self.wfile.write(data)

    def put_command(self, path, qs):
        clen = int(self.headers['Content-Length'])
        data = self.rfile.read(clen)
        print ("Sending data to Fermware: '%s'" % data)
        data = self.server.connection.send_receive(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write("Command submitted: " + data)


class FermwareProxy(BaseHTTPServer.HTTPServer):
    def __init__(self, host, port, fermware_tty):
        BaseHTTPServer.HTTPServer.__init__(
            self,
            (host, port),
            Handler
        )
        self.connection = fermware_tty


def poller(tty, sleeptime=60):
    global _running

    sensor_map = {
        "28:C6:1E:51:05:00:00:8F": "Bottom",
        "28:CE:B9:50:05:00:00:C3": "Glycol"
    }

    print ("Polling thread started..")
    # TODO: Fetch configuration data from CouchDB

    import httplib
    conn = httplib.HTTPConnection('www.cwi.nl')

    while _running:
        print("Polling sensor data")
        time.sleep(sleeptime)

        # Check for stdin disconnection
        while sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
            if not sys.stdin.readline():
                _running = False

        from datetime import datetime
        now = list(datetime.now().timetuple())[:-2]

        data = json.loads(tty.send_receive('list_sensors'))
        for sensor in data:
            sdata = sensor.copy()
            sdata['date'] = now
            sdata['type'] = "sensor_value"
            sdata['sensor_id'] = sensor_map.get(sensor['address'], sensor['address'])




def main():
    global _running

    tty = FermwareTTY('/dev/ttyACM0', 115200)
    tty.connect()

    httpd = FermwareProxy('0.0.0.0', 7999, tty)
    polling_thread = threading.Thread(target=poller, args=[tty, 1])
    polling_thread.start()

    while _running:
        try:
            httpd.handle_request()
        except KeyboardInterrupt:
            _running = False

    httpd.server_close()


if __name__ == '__main__':
    main()
