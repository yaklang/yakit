import React from "react";
import "../main.css";
import {MITMPluginTemplateShort} from "../invoker/data/MITMPluginTamplate";
import {MITMPluginListProp} from "./MITMPluginList";
import {MITMPluginLogViewerProp} from "./MITMPluginLogViewer";

export interface MITMPluginOperatorProps extends MITMPluginListProp, MITMPluginLogViewerProp {
}