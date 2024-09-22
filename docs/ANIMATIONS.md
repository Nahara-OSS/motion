# Animations
## What is keyframe?
Keyframe is basically the value of the property at specified time. For example, if you have a keyframe with `t = 0.5s` and `v = 42.0`, the value at `t = 0s` is `0` and `t = 0.5s` is `42.0`.

In Nahara's Motion, the value of the property is interpolated between 2 nearby keyframes (before and after the current seeking pointer). If the seeking pointer is sitting right on top of keyframe, the value will be equals to that keyframe.

## Adding your first keyframe
> This section requires Properties pane. If it doesn't visible, you can open it by clicking Window > Panes > Properties.

To add your first keyframe on object, click on "Toggle Keyframe" button next to object's property in Properties pane. This will make the button becomes fully dark and a new keyframe will be placed in Timeline (open Timeline pane and expand your object to see it).

## Adding next keyframes
Once you placed your first keyframe, you property will be marked as "animated" and you can place another keyframes by moving the seeking pointer and doing either of

- Clicking the "Toggle Keyframe" button again, or
- Change the property value by dragging slider or dragging object in viewport.

If you do the later one, it will automatically place a new keyframe when your animated property changes (or change the one under your seeking pointer if there exists a keyframe at current time). This is known as "auto keyframing" and currently, there is no toggle to disable this in Nahara's Motion.

## Live keyframing
Nahara's Motion supports live keyframing, which automatically place keyframes during playback. To use this, simply ensure that your property is marked as animated, then slowly adjust it during playback. You can also move/resize the object in viewport if the positional/size properties are marked as animated.