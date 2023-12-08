.PHONY: all clean ess

libs = aatree.js base.js layout.js
srcs = browser.js ess-core.js grammar.js index.js signatures.js
lib = $(addprefix lib/, $(libs)) 
src = $(addprefix src/, $(srcs)) 

# Actions

all: ess repl

clean:
	@ test -d dist/ && rm -r dist/ || exit 0

run:
	@ echo $(lib) $(src)
	open dist/repl.html

dist/:
	mkdir ./dist

# Ess bundles

ess: dist/ess.out.js dist/ess.min.js

dist/ess.out.js: dist/ $(lib) $(src) Makefile
	@ echo "Making browser bundle"
	@ esbuild --bundle src/browser.js > dist/ess.out.js

dist/ess.min.js: dist/ $(lib) $(src) Makefile
	@ echo "Making minified browser bundle"
	@ esbuild --bundle --minify src/browser.js > dist/ess.min.js

# Repl

repl: ess dist/repl.html dist/repl.js

dist/repl.html: src/repl.html
	cp src/repl.html dist/repl.html

dist/repl.js: lib/repl.js
	cp lib/repl.js dist/repl.js

