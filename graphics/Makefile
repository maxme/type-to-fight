CHARSVG=$(shell find . -name "char*svg")


all: charsprites backgrounds spritesheet

spritesheet:
	TexturePacker spritesheet1.tps

charsprites:
	for i in $(CHARSVG); do python ../scripts/export_svg_layers.py $$i  spritesheet1/; done

.PHONY: backgrounds
backgrounds:
	cd ../scripts/ && sh make-all-backgrounds.sh

clean:
	rm -f ../static/spritesheets/spritesheet1.png
	rm -rf spritesheet1/char-*
	rm -rf ../static/images/backgrounds/*
