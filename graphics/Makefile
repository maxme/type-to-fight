CHARSVG=$(shell find . -name "char*svg")

all: charsprites
	echo $(SVG)
	TexturePacker spritesheet1.tps

charsprites:
	for i in $(CHARSVG); do python ../scripts/export_svg_layers.py $$i  spritesheet1/; done

clean:
	rm -f ../static/spritesheets/spritesheet1.png
	rm -rf spritesheet1/char-*
