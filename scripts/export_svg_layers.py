import sys
import os

def export_layer(input, outdir):
    inkscape = "/Applications/Inkscape.app/Contents/Resources/bin/inkscape"
    out = ""
    defs = {
        "arm-right": ["layer0"],
        "torso": ["layer1"],
        "arm-left": ["layer2"],
        "head": ["layer3"],
        "hair": ["layer4"],
        "mouth-open": ["layer5"],
        "mouth-close": ["layer6"],
        "eyes": ["layer7"],
        "eyes-dead": ["layer8"],
        "leg-right": ["layer9"],
        "leg-left": ["layer10"],
        }
    for i in defs:
        out = i + '.png'
        layer = defs[i][0]
        opts = " -z --export-png=%(outdir)s/%(out)s --export-id=%(layer)s --export-id-only --export-area-page -d 67.5 %(input)s" % locals()
        cmd = inkscape + opts
        os.system(cmd)

if __name__ == "__main__":
    export_layer(sys.argv[1], sys.argv[2])

