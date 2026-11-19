from collections import deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException

_buckets = {}
_lock = Lock()


def limit(req, key, maximum, window=300):
    now = monotonic()
    k = (req.client.host, key)
    with _lock:
        for old in list(_buckets):
            if not _buckets[old] or _buckets[old][-1] + window < now:
                del _buckets[old]
        b = _buckets.setdefault(k, deque())
        while b and b[0] + window < now:
            b.popleft()
        if len(b) >= maximum:
            raise HTTPException(429, "Too many requests. Please try again later.")
        b.append(now)
