# Build the frontend:

FROM node:26-slim AS base

COPY front-end/ /webapp/
WORKDIR /webapp

RUN npm ci
RUN npm run build

# Then build Python app and copy built frontend in:

FROM python:3.15.2

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY requirements.txt /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt

COPY back-end/ /usr/src/app

COPY --from=base /webapp/dist/front-end/index.html /usr/src/app/templates/index.html
COPY --from=base /webapp/dist/front-end/ /usr/src/app/static

CMD gunicorn --config=gunicorn_conf.py app:app
