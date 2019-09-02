#! /bin/bash

source $(dirname $0)/config
TAG="$(git rev-parse HEAD)"
helm template --set version=${TAG} ./deploy | kubectl apply -f -
