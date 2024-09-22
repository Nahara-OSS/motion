import { IAddon, IAddonHost } from "../addon/addon.js";
import { registries } from "../addon/registries.js";
import { objects } from "../scene/object.js";

export class NaharaMotionSystemAddon implements IAddon {
    name = "Nahara's Motion (built-in)";

    init(host: IAddonHost): Promise<void> | void {
        host.logger.info("Registering scene object types");
        const objectsReg = host.getRegistry(registries.Objects);
        objectsReg.register("box2d", objects.Box2D.Type);
        objectsReg.register("text2d", objects.Text2D.Type);
        objectsReg.register("container", objects.Container.Type);
        objectsReg.register("data1d", objects.Data1D.Type);
        objectsReg.register("data2d", objects.Data2D.Type);

        host.logger.info("System addon init finished! Welcome to Nahara's Motion!");
    }
}