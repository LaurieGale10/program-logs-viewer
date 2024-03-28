# Build the frontend:

FROM node:20 AS base

COPY front-end/ /webapp/
WORKDIR /webapp

RUN npm install
RUN npm run build

# Then build Python app and copy built frontend in:

FROM python:3.11

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY requirements.txt /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt

COPY back-end/ /usr/src/app

COPY --from=base /webapp/dist/front-end/index.html /usr/src/app/templates/index.html
COPY --from=base /webapp/dist/front-end/ /usr/src/app/static

CMD gunicorn --config=gunicorn_conf.py app:app
