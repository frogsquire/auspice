import { dataFont, darkGrey } from "../../../globalStyles";

export const createDefaultParams = () => ({
  regressionStroke: darkGrey,
  regressionWidth: 6,
  majorGridStroke: "#DDD",
  majorGridWidth: 2,
  minorGridStroke: "#EEE",
  minorGridWidth: 1,
  tickLabelSize: 12,
  tickLabelFill: darkGrey,
  minorTicks: 4,
  orientation: [1, 1],
  margins: {left: 30, right: 15, top: 10, bottom: 40},
  showGrid: true,
  fillSelected: "#A73",
  radiusSelected: 5,
  branchStroke: "#AAA",
  branchStrokeWidth: 2,
  tipStroke: "#AAA",
  tipFill: "#CCC",
  tipStrokeWidth: 1,
  tipRadius: 4,
  fontFamily: dataFont,
  /* B R A N C H   L A B E L S */
  branchLabelKey: false,
  branchLabelFont: dataFont,
  branchLabelFill: "#777",
  branchLabelFontWeight: 500,
  branchLabelPadX: 8,
  branchLabelPadY: 5,
  /* T I P   L A B E L S */
  tipLabels: true,
  tipLabelFont: dataFont,
  tipLabelFill: "#555",
  tipLabelPadX: 8,
  tipLabelPadY: 2,
  mapToScreenDebounceTime: 500,
  tipLabelFontSizeL1: 8,
  tipLabelFontSizeL2: 10,
  tipLabelFontSizeL3: 12,
  tipLabelBreakL1: 75,
  tipLabelBreakL2: 50,
  tipLabelBreakL3: 25,
  confidence: false,
  splitTreeByTrait: null
});
