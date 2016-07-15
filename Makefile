.PHONY: all
all:
	node builder.js
	git add .
	git commit -m"update posts"
	git push origin gh-pages
