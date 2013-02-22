TESTS = test/*.js
SOURCES = $(shell find static/js -name '*.js' -depth 1)
SOURCES_COV = $(SOURCES:.js=-cov.js)

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
			--require should \
			--reporter list \
			--slow 20 \
			--growl \
			$(TESTS)

coverage/%-cov.js: %.js
	jscoverage $< coverage/$@

app-cov: $(SOURCES_COV)

test-cov: app-cov
	@EXPRESS_COV=1 $(MAKE) test

.PHONY: test