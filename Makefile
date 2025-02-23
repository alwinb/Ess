.PHONY: clean ess

libs = aatree.js base.js layout.js
srcs = ess-core.js grammar.js index.js signatures.js
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

ess: dist/ess.min.js

dist/ess.min.js: dist/ $(lib) $(src) Makefile
	@ echo "Making minified bundle"
	@ esbuild --bundle --minify src/index.js > dist/ess.min.js

# Repl

repl: ess dist/repl.html dist/repl.js

dist/repl.html: src/repl.html
	cp src/repl.html dist/repl.html

dist/repl.js: lib/repl.js
	cp lib/repl.js dist/repl.js

