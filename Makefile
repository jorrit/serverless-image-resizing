.PHONY: all image package dist clean test

all: package

image:
	docker build --tag amazonlinux:nodejs .

package: image
	docker run --rm --volume ${PWD}/lambda:/build --tmpfs /build/node_modules:exec amazonlinux:nodejs npm install --production

dist
    docker run --rm --volume ${PWD}/lambda:/build --tmpfs /build/node_modules:exec amazonlinux:nodejs npm run install-and-package
    mv lambda/function.zip deploy/function.zip

clean:
	rm -r lambda/node_modules
	docker rmi --force amazonlinux:nodejs

test: package
	docker run -ti --rm --volume ${PWD}/lambda:/build --volume ~/.aws/:/root/.aws --tmpfs /build/node_modules:exec amazonlinux:nodejs npm run install-and-test
