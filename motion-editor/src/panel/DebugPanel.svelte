<script lang="ts">
    import * as factory from "@nahara/motion/factory";

    import ExpressionTextField from "../component/ExpressionTextField.svelte";
    import Panel from "../component/Panel.svelte";
    import TextLabel from "../component/TextLabel.svelte";

    let expr = $state<string>("");
</script>

<Panel>
    <div class="content">
        <div class="label">
            <TextLabel>Expression input:</TextLabel>
        </div>
        <ExpressionTextField
            value={expr}
            onValueChange={(value) => (expr = value)}
            lookupVariable={(name) => factory.bundle.globals.get(name)?.type ?? null}
        />
    </div>
</Panel>

<style>
    .content {
        display: flex;
        flex-direction: column;
        padding: 0.5rem;
        gap: 0.2rem;

        .label {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 0.2rem;
            height: 2rem;
            box-sizing: border-box;
        }
    }
</style>
