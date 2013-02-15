TESTS = test/*.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
			--require should \
			--reporter list \
			--slow 20 \
			--growl \
			$(TESTS)


app-cov:
	jscoverage server.js

test-cov: app-cov
	@EXPRESS_COV=1 $(MAKE) test

.PHONY: test