# Objects (Scene objects)
## What are objects?
Objects are part of the scene, which can be either visible (graphic objects), or invisible (data, audio, etc). Each object have a collection of property, which can be adjusted either via hand or automation with animation keyframes.

## Type of objects
- Graphical objects: These objects are visible in viewport.
- Audible objects: These objects are audible and will be played when the seek head reaches the start of object's lifetime.
- Data objects: These objects are mainly used for storing baked data in a form of keyframes.
- Miscellaneous objects: These objects are not covered by above types.

## Data objects
Data objects are generally created for baking process, but users can add keyframes manually and link these to other objects.

### Baking keyframes
Keyframes can be baked to data objects by:

- Analyzing the audio file (mainly used for visualization);
- Recording sensor values;
- etc.

> String/Text data in data objects are not supported at this moment.

### Linking data
_Not yet implemented. The following content is a draft for future implementation._

Now that your data object have data points baked as keyframes, you will need to link it to somewhere, like `x` property of a box for example. To do that, simply drag the data object from Outliner pane and drop it to the `x` property in either Properties pane or Timeline pane. This will allows `x` property to copy the `data` value of your data object.

### Linking data - Advanced
_Not yet implemented. The following content is a draft for future implementation._

But what if you want to use more than 1 data object?

Move back to previous section, if you expand the box's properties in Timeline, you'll see that your `x` property's timeline now looks like this:

```
[a: Data (1D) (x)] f(t) = [a(t)]
```

From this image, you can see that your `Data (1D)` is a function `a(t)`, and our formula `f(t)` is `a(t)`. In other words, this property is copying the value from `Data (1D)` to `x`.

Clicking the `(x)` button on `[a: Data (1D) (x)]` will remove the variable and the property will be resetted to normal. To add another data object as a new function, drag the object from Outliner and drop it to the `x` property in either Timeline pane or Properties pane. This will add a new `[b: Data (1D) (x)]` button next to `[a: Data (1D) (x)]`, and if you haven't modified your formula yet, it will changes from `a(t)` to `a(t) + b(t)`.

```
[a: Data (1D) (x)][b: Data (1D) (x)] f(t) = [a(t) + b(t)]
```

In addition, you can also:

- Use trigonometry functions, like `sin(x)` and `asin(x)`;
- Use constants like `pi` (3.1415926535898) or `e` (such that `ln(e) == 1`);
- Use other math functions like `log(base, val)`, `log2()`, `ln()`;
- Function in function: `a(b(t))`.