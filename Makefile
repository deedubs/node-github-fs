MOCHA=./node_modules/.bin/mocha

test:
	@${MOCHA} test

.PHONY: test