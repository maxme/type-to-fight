#!/bin/sh

files=$(echo $1*png|sort)
geom=$(file $files | head -n 1| cut -d ' ' -f 5-7| sed 's/ //g'|sed 's/,//g')
montage $files -background '#00000000' -tile x1 -geometry $geom+0+0 $1sheet.png


