STATIC_DIR=../static/images/backgrounds/

j=0
for i in ../graphics/backgrounds/textures/*png; do
    python background_maker.py $STATIC_DIR/bg-1.png $i $STATIC_DIR/bg-$j.png
    j=$(($j + 1))
    echo $i
done
