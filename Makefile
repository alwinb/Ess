.PHONY: all clean ess

all: ess repl
ess: dist/ess.min.js
repl: dist/repl.html dist/repl.js

libs = aatree.js base.js layout.js
srcs = browser.js index.js desugar.js ess-core.js grammar.js
lib = $(addprefix lib/, $(libs)) 
src = $(addprefix src/, $(srcs)) 

dist/ess.min.js: dist/ $(lib) $(src)
	@ echo "Making minified browser bundle"
	@ esbuild --bundle --minify src/browser.js > dist/ess.min.js

dist/repl.html: dist/ src/repl.html dist/ess.min.js dist/repl.js
	@ cp src/repl.html ./dist/repl.html

dist/repl.js: dist/ lib/browser_repl.js
	@ cp lib/browser_repl.js ./dist/repl.js

dist/:
	@ mkdir ./dist

clean:
	@ test -d dist/ && rm -r dist/ || exit 0

run:
	@ echo $(lib) $(src)
