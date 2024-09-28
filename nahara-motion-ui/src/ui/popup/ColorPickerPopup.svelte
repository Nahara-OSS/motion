<script lang="ts">
    import PropertyValuePart from "../properties/PropertyValuePart.svelte";

    export let initial: string;
    export let callback: (color: string) => any;

    let r = 0, g = 0, b = 0, a = 0;

    if (initial.startsWith("#")) {
        if (initial.length == 7 || initial.length == 9) {
            r = Number.parseInt(initial.substring(1, 3), 16);
            g = Number.parseInt(initial.substring(3, 5), 16);
            b = Number.parseInt(initial.substring(5, 7), 16);
            a = initial.length == 9 ? Number.parseInt(initial.substring(7, 9), 16) : 255;
        }

        if (initial.length == 4 || initial.length == 5) {
            r = Math.floor(Number.parseInt(initial[1], 16) * 255 / 15);
            g = Math.floor(Number.parseInt(initial[2], 16) * 255 / 15);
            b = Math.floor(Number.parseInt(initial[3], 16) * 255 / 15);
            a = initial.length == 5 ? Math.floor(Number.parseInt(initial[4], 16) * 255 / 15) : 255;
        }
    }

    function sendUpdate() {
        const red = r.toString(16).padStart(2, '0');
        const gre = g.toString(16).padStart(2, '0');
        const blu = b.toString(16).padStart(2, '0');
        const alp = a.toString(16).padStart(2, '0');
        const css = `#${red}${gre}${blu}${alp}`;
        callback(css);
    }
</script>

<div>
    <PropertyValuePart name="R" value={r} color="#ff0000" on:update={e => { r = e.detail; sendUpdate(); }} />
    <PropertyValuePart name="G" value={g} color="#00ff00" on:update={e => { g = e.detail; sendUpdate(); }} />
    <PropertyValuePart name="B" value={b} color="#0000ff" on:update={e => { b = e.detail; sendUpdate(); }} />
    <PropertyValuePart name="A" value={a} color="#ffffff" on:update={e => { a = e.detail; sendUpdate(); }} />
</div>