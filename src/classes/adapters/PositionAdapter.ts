import LineColumn = require("line-column");
import { IPosition } from "../Linter";
export interface IAcornPosition {
	line: number,
	column: number
}

export class PositionAdapter {
	static offsetToPosition(content: string, position: number): IPosition | null {
		const lineColumn = LineColumn(content).fromIndex(position);
		return lineColumn && { column: lineColumn.col - 1, line: lineColumn.line - 1 };
	}

	static acornPositionToVSCodePosition(position: IAcornPosition): IPosition {
		return { column: position.column, line: position.line - 1 };
	}
}