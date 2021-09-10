import LineColumn = require("line-column");
import { IRange } from "../Linter";
import { IAcornPosition, PositionAdapter } from "./PositionAdapter";

export interface IAcornLocation {
	start: IAcornPosition,
	end: IAcornPosition
}

export class RangeAdapter {
	static offsetsRange(content: string, positionBegin: number, positionEnd: number): IRange | undefined {
		const lineColumn = LineColumn(content);
		const lineColumnBegin = lineColumn.fromIndex(positionBegin);
		const lineColumnEnd = lineColumn.fromIndex(positionEnd);
		if (lineColumnBegin && lineColumnEnd) {
			const positionBegin = { column: lineColumnBegin.col - 1, line: lineColumnBegin.line };
			const positionEnd = { column: lineColumnEnd.col - 1, line: lineColumnEnd.line };
			return { start: positionBegin, end: positionEnd };
		}
	}

	static acornPositionsToRange(positionBegin: IAcornPosition, positionEnd: IAcornPosition) {
		return { start: positionBegin, end: positionEnd };
	}

	static acornLocationToRange(location: IAcornLocation) {
		const vscodePositionBegin = PositionAdapter.acornPositionToPosition(location.start);
		const vscodePositionEnd = PositionAdapter.acornPositionToPosition(location.end);
		return { start: vscodePositionBegin, end: vscodePositionEnd };
	}
}