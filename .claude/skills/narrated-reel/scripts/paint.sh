#!/bin/zsh
# Repaints real photographs as house-style paintings through Codex on the owner's ChatGPT plan (no API credit).
# In the reel's folder: scenes.txt has one line per scene, name|photo file in photos/|what to paint.
# kit.txt holds the kit rules for this match. style.jpg is the style reference.
# A scene the image system refuses is reported, not reworded to get past it.
M=$PWD; mkdir -p scenes; KIT=$(cat kit.txt)
STY="Style: a detailed, semi-realistic watercolour illustration, like a sports-magazine cover. Vivid, saturated colours with strong contrast, crisp detail, confident brush edges, a dark detailed background with any crowd as blurred colour. Fill the whole frame edge to edge with painted image: no white paper border, no empty paper. Keep the pose, faces and likenesses exactly as photographed so each player is instantly recognisable, and show every whole head inside the frame. Advertising boards must be blurred blocks of colour with no readable words. No text, signature or watermark."
while IFS='|' read -r name photo desc; do
 ( T="Call your built-in image_gen tool exactly once to make one vertical 1024x1536 image. The first attached image is the real photograph to repaint; extend the background upward and downward to fill the vertical frame, keeping the main action in the centre. The second attached image is the style reference only. Do not read any file, run any command or write any file. When the image is made, reply only DONE. If image generation is refused, reply REFUSED and the reason.

Image instructions: $desc $KIT $STY"
   print -r -- "$T" | codex exec --skip-git-repo-check --sandbox read-only -c project_doc_max_bytes=0 -C $M -i "$M/photos/$photo" -i $M/style.jpg > scenes/$name.log 2>&1
   sid=$(grep -oiE 'session id: *[0-9a-f-]+' scenes/$name.log | awk '{print $NF}' | head -1)
   f=$(ls -t ~/.codex/generated_images/$sid/*.png 2>/dev/null | head -1)
   [[ -n $f ]] && cp "$f" scenes/$name.png && echo "$name ok" || { echo "$name NONE"; tail -3 scenes/$name.log | cut -c1-300; } ) &
done < scenes.txt
wait
