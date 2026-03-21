import { Router, type IRouter } from "express";
import healthRouter from "./health";
import climateRouter from "./climate";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/climate", climateRouter);

export default router;
