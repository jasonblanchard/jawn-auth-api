FROM node:8.16.0-jessie AS base

ENV APP_HOME /usr/src/app/
ENV PROD_DEPS /usr/src/deps/prod/
RUN useradd -ms /bin/bash docker

FROM base AS build

USER docker

COPY --chown=docker:docker package.json package-lock.json $PROD_DEPS
WORKDIR $PROD_DEPS
RUN npm ci --production

COPY --chown=docker:docker package.json package-lock.json $APP_HOME
WORKDIR $APP_HOME
RUN npm ci

COPY --chown=docker:docker src $APP_HOME/src/

FROM build as test

USER docker

COPY --chown=docker:docker tests $APP_HOME/tests/

WORKDIR $APP_HOME

FROM base as release

USER docker

COPY --from=build --chown=docker:docker $PROD_DEPS/node_modules $APP_HOME/node_modules/
COPY --from=build --chown=docker:docker $APP_HOME/src $APP_HOME/src
COPY --from=build --chown=docker:docker $APP_HOME/package.json $APP_HOME/package.json

WORKDIR $APP_HOME

CMD ["npm", "start", "--production"]