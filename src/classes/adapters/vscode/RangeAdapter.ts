import LineColumn = require("line-column");
import { IRange } from "../../js/jslinter/parts/abstraction/Linter";
import { IAcornPosition, PositionAdapter } from "./PositionAdapter";

export interface IAcornLocation {
	start: IAcornPosition,
	end: IAcornPosition
}

export class RangeAdapter {
	static offsetsToVSCodeRange(content: string, positionBegin: number, positionEnd: number): IRange | undefined {
		const lineColumn = LineColumn(content);
		const lineColumnBegin = lineColumn.fromIndex(positionBegin);
		const lineColumnEnd = lineColumn.fromIndex(positionEnd);
		if (lineColumnBegin && lineColumnEnd) {
			const positionBegin = { column: lineColumnBegin.col - 1, line: lineColumnBegin.line - 1 };
			const positionEnd = { column: lineColumnEnd.col, line: lineColumnEnd.line - 1 };
			return { start: positionBegin, end: positionEnd };
		}
	}

	static acornPositionsToVSCodeRange(positionBegin: IAcornPosition, positionEnd: IAcornPosition) {
		return { start: positionBegin, end: positionEnd };
	}

	static acornLocationToVSCodeRange(location: IAcornLocation) {
		const vscodePositionBegin = PositionAdapter.acornPositionToVSCodePosition(location.start);
		const vscodePositionEnd = PositionAdapter.acornPositionToVSCodePosition(location.end);
		return { start: vscodePositionBegin, end: vscodePositionEnd };
	}
}