.PHONY: all image package dist clean test

all: package

image:
	docker build --tag amazonlinux:nodejs .

package: image
	docker run --rm --volume ${PWD}/lambda:/build amazonlinux:nodejs npm install --production

dist: package
	cd lambda && zip -FS -q -r ../dist/function.zip *

clean:
	rm -r lambda/node_modules
	docker rmi --force amazonlinux:nodejs

test: package
	docker run -ti --rm --volume ${PWD}/lambda:/build --volume ~/.aws/:/root/.aws amazonlinux:nodejs npm install
	docker run -ti --rm --volume ${PWD}/lambda:/build --volume ~/.aws/:/root/.aws amazonlinux:nodejs npm test
