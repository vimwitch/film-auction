#!/bin/sh

set -e

NAME=GANACHE_FILM_CHAIN

docker stop $NAME || true
docker rm $NAME || true

if [ "$@" == "--stop" ]
then
  exit
fi

docker run -d --name $NAME -p 7545:7545 trufflesuite/ganache-cli:latest -b 5 -p 7545

sleep 2
