#! /bin/bash

source $(dirname $0)/config
TAG="$(git rev-parse HEAD)"
helm template --set version=${TAG} -f deploy/values.secret.yaml ./deploy | kubectl apply -f -
