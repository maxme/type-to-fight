#!/bin/python
import redis
import sys
import random

r = redis.StrictRedis(host='localhost', port=6379, db=0)
uids = map(lambda x: x.strip(), open('facebook_uid.txt').readlines())

amin = 1000
amax = 200000
for uid in uids:
    r.zadd('ratings', random.randrange(amin, amax), uid)


