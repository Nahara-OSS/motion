import { IAddon, IAddonHost } from "../addon/addon.js";
import { registries } from "../addon/registries.js";
import { Box2D } from "./scene/box2d.js";
import { Container } from "./scene/container.js";
import { Data1D, Data2D } from "./scene/data.js";
import { Text2D } from "./scene/text2d.js";

export class NaharaMotionSystemAddon implements IAddon {
    name = "Nahara's Motion (built-in)";

    init(host: IAddonHost): Promise<void> | void {
        host.logger.info("Registering scene object types");
        const objectsReg = host.getRegistry(registries.Objects);
        objectsReg.register("box2d", Box2D.Type);
        objectsReg.register("text2d", Text2D.Type);
        objectsReg.register("container", Container.Type);
        objectsReg.register("data1d", Data1D.Type);
        objectsReg.register("data2d", Data2D.Type);

        host.logger.info("System addon init finished! Welcome to Nahara's Motion!");
    }
}