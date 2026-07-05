# Nahara's Motion expression language

- [Introduction](#introduction)
- [Animating a property](#animating-a-property)
- [Quick example](#quick-example)
- [Basic syntax](#basic-syntax)
- [Tab completion](#tab-completion)
- [Quick reference guide](#quick-reference-guide)
- [Cheat sheet](#cheat-sheet)

## Introduction

Welcome to Nahara's Motion expression language manual! Here you can learn more
about the expression language, why math expression input was needed in the first
place and explore tips & tricks on using math expression.

## Animating a property

There are 2 ways of animation a property in Motion:

- **Keyframe animation**: You would place the keyframes on the timeline, where
  each keyframe represent the value that the property must have at specific
  time. Between two keyframes is a tweening curve, which is the curve that
  describes the transition between two values (in the case of Motion, the curve
  is a cubic bezier with two control points).

- **Math expression**: In some cases where keyframe-based animation can't be
  used due to the complexity of the animation, such as copying the position of
  another object, math expression may be used. Math expression allows you to
  control the value of the property that's based on variables, functions, math
  equations and even from another keyframe timeline.

For simple animation, keyframe-based animation is sufficient as it is simple
enough to learn and use while having a good flexibility thanks to cubic bezier
curve. For math expression animation however, while it can do complex animation,
it is also quite complicated to use as it uses a custom expression language that
describe how the value should be computed.

## Quick example

Let's get started with the simple example: creating 5 copies of a box, where
each copy slides in from bottom with 1-second sequential delay.

Create a new scene with the following scene tree:

- **Repeat**
  - **Box**

For **Repeat** object, set the repeat count to 5 and expression name field to
whatever you want (in this quick example, we will name it `repeat`).

> Expression names are case-sensitive, must be unique for entire scene (no
> duplicated names) and only contains alphanumeric and underscores (_). This
> requirement will be explained later in the manual.

For the **Box**'s position property field, click on the `f(x)` button to toggle
expression input mode, or you can click on text box and press `=` on your
keyboard. Now you can enter the following expression:

```
vec2(0, lerp(-800, 0, time - @repeat.repeatIndex))
```

If you set the seekhead back to `t = 0s` and play the animation, the objects
will slowly slide up, each with delay of 1 second.

Congratulations! You have just animated the boxes with math expression.

## Basic syntax

### Keywords

```
keyword        := booleanKeyword | binaryOp | unaryOp
booleanKeyword := 'true' | 'false'
binaryOp       := '+' | '-' | '*' | '/' | '==' | '!=' | '>' | '<' | '>=' | '<='
unaryOp        := '+' | '-' | '!'
```

- **Boolean** (`true` or `false`): Constants representing the truth values.

- **Binary operators**: Apply math operation between 2 values. The operator sits
  between 2 values with `<a> <operator> <b>` infix pattern.
  - `+`, `-`, `*`, `/`: Add, subtract, multiply or divide two values
  - `==`, `!=`: Compare two values (equals or not equals) and produce a boolean
  - `>`, `<`, `>=`, `<=`: Compare two _numbers_ (greater than, less than,
    greater than or equals or less than or equals) and produce a boolean

- **Unary operators**: Apply math operation on a single value. The operator sits
  before the value with `<operator> <value>` prefix pattern.
  - `+`: Represents a positive value (doesn't do anything at this moment)
  - `-`: Negate a number (eg: converts a positive number to negative)
  - `!`: Negate a boolean (eg: turns `false` into `true`)

### Grouping

```
group := '(' + expression + ')'
```

Explictly define the order of operations with parentheses. For example,
`1 * 2 + 3` would evaluates `1 * 2` first before addding `3`, while
`1 * (2 + 3)` would multiply `1` by the result of `2 + 3`.

### Number

```
number := [0-9]+(\.[0-9]*)? | \.[0-9]
```

Numbers can be integers, decimals or fractions starting with a decimal point
(`.`).

### Text

A text starts with either single (`'`) or double (`"`) quotation marks, followed
by the content of the text and ends with the same kind of quotation marks as the
starts. To use the quotation marks that matches the starts inside the text, use
the escape character ('\').

- `"Hello world"` is a valid text;
- `"Put the \"fries\" in the bag"` is also a valid text (produces
  `Put the "fries" in the bag`);
- `"Are you calling me "awesome"?"` is not a valid text, as the quotation marks
  inside the text are not escaped (if you are curious, the parser read this as
  `Are you calling me` text, followed by `awesome` identifier and then `?`).

### Identifier

```
identifier := [A-Za-z_][A-Za-z0-9_]*
```

An identifier always start with a letter or an underscore, followed by any
combination of letters, numbers or underscores.

- `time` is a valid identifier;
- `_` is also a valid identifier;
- `0p` is not a valid identifier (the `0` character matches the pattern that the
  number syntax is looking for)

### Reference (`@`)

```
reference := '@' + identifier
```

Referencing an object is required to obtain the property of it, such as current
repeat index or position of the object. It may also be known as "identifier with
an `@` symbol".

The object is only visible to the expression when all of the following is
satisfied:

- The referenced object must have a valid expression name that follows the rules
  of an identifier;
- The object owning the property must be a descendant of referenced object.
  - The object must be an immediate child of referenced object, or;
  - The referenced object is an ancestor higher up in the current object's
    direct family tree (_too technical, revise?_).

### Property access (`.`)

```
propertyAccess := expression + '.' + identifier
```

Property access allows accessing a particular property of value, such as current
repeat index of **Repeat** object, the size of **Text** or X/Y value of a
vector.

### Function call

```
functionCall := expression + '(' + (expression + (',' + expression)*)? + ')'
```

A function call starts with expression that produce a value, followed by a list
of comma-separated parameters inside `(` and `)`.

- `animator(time)` is a valid function call;
- `1.5(x)(y)` is a valid function call _syntax_, but it fails due to `1.5` not
  being callable;
- Believe it or not, `funnyFunction()()()()` is still a valid function call
  syntax, assuming each function call produces another callable value;
- `f(,)` is not a valid function syntax.

### Conditional

```
conditional := 'if' + expression:condition + expression:trueBranch + 'else' + expression:falseBranch
```

Check whether the condition is true, then evaluate the expression in true branch
(false branch otherwise). Examples:

- `if true always else never`: Always return `always` variable because the
  condition is always `true`;
- `if time < 1000 0 else time - 1000`: Always return `0` while `time` is less
  than 0, `time - 1000` otherwise;
- `(if time < 1000 0 else time - 1000) / 5000`: The above but divides the result
  by `5000` regardless the condition.

## Tab completion

As you type the expression, the tab completion dropdown appears based on what
you are typing. You can use `Up` and `Down` arrow keys to select suggested
input, and press `Tab` to insert it to your expression.

## Quick reference guide

While entering the math expression, you can move the text cursor (by clicking on
text or use `Left`/`Right` arrow keys) over any literal (boolean, text or number
constants), parenthesis or identfier to quickly view documentation and all
available properties for particular value.
