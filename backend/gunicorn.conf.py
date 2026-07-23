# Production Gunicorn WSGI Configuration
import os
import multiprocessing

bind = f"0.0.0.0:{os.environ.get('PORT', 5000)}"
workers = os.environ.get('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1)
worker_class = 'gthread'
threads = 4
timeout = 120
keepalive = 5

accesslog = '-'
errorlog = '-'
loglevel = 'info'
