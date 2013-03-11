from PIL import Image

class BackgroundMaker(object):
    def __init__(self):
        self.w = 373
        self.h = 207

    def load_layer(self, filename):
        layer = Image.open(filename)
        layer.load()
        self.mask_alpha = layer.split()[-1]


    def make_background(self, filename, out):
        cur_img = Image.open(filename)
        new_img = Image.new('RGBA', (self.w, self.h))
        w, h = cur_img.size
        for x in range(int(self.w / w)+1):
            for y in range(int(self.h / h)+1):
                new_img.paste(cur_img, (x * w, y * h))

        new_img.putalpha(self.mask_alpha)
        new_img.save(out)

def main():
    import sys
    bm = BackgroundMaker()
    bm.load_layer(sys.argv[1])
    bm.make_background(sys.argv[2], sys.argv[3])

if __name__ == "__main__":
    main()
