<div class="menu-bar">
    <div class="left">
        <div class="menu">File</div>
        <div class="menu">Window</div>
        <div class="menu">Help</div>
    </div>
    <div class="middle">
        <div class="menu">Untitled Project - Nahara's Motion</div>
    </div>
    <div class="right">
        <div class="tab selected">General</div>
        <div class="tab">Design</div>
        <div class="tab">Animation</div>
    </div>
</div>

<style lang="scss">
    .menu-bar {
        height: 34px;
        background-color: #efefef;
        border-bottom: 1px solid #d1d1d1;
        box-sizing: border-box;
        display: flex;
        padding: 0 8px;

        .left, .right {
            display: flex;
        }

        .middle {
            display: flex;
            flex: 1 1 auto;
            justify-content: center;
        }

        .tab, .menu {
            padding: 10px;
            &:hover { background-color: #0000000f; }
            &.selected { background-color: #fff; }
        }
    }
</style>