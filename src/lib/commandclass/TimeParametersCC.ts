import { IDriver } from "../driver/IDriver";
import { validatePayload } from "../util/misc";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum TimeParametersCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

@API(CommandClasses["Time Parameters"])
export class TimeParametersCCAPI extends CCAPI {
	public async get(): Promise<Date> {
		const cc = new TimeParametersCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<TimeParametersCCReport>(
			cc,
		))!;
		return new Date(
			Date.UTC(
				response.year,
				response.month - 1,
				response.day,
				response.hour,
				response.minute,
				response.second,
			),
		);
	}

	public async set(date: Date): Promise<void> {
		const cc = new TimeParametersCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: date.getUTCHours(),
			minute: date.getUTCMinutes(),
			second: date.getUTCSeconds(),
		});
		await this.driver.sendCommand(cc);
	}
}

export interface TimeParametersCC {
	ccCommand: TimeParametersCommand;
}

@commandClass(CommandClasses["Time Parameters"])
@implementedVersion(1)
export class TimeParametersCC extends CommandClass {
	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const api = node.commandClasses["Time Parameters"];

		// Set the node to the current time
		await api.set(new Date());

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(TimeParametersCommand.Report)
export class TimeParametersCCReport extends TimeParametersCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 7);
		this.year = this.payload.readUInt16BE(0);
		this.month = this.payload[2];
		this.day = this.payload[3];
		this.hour = this.payload[4];
		this.minute = this.payload[5];
		this.second = this.payload[6];
	}

	public readonly year: number;
	public readonly month: number;
	public readonly day: number;
	public readonly hour: number;
	public readonly minute: number;
	public readonly second: number;
}

@CCCommand(TimeParametersCommand.Get)
@expectedCCResponse(TimeParametersCCReport)
export class TimeParametersCCGet extends TimeParametersCC {}

interface TimeParametersCCSetOptions extends CCCommandOptions {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

@CCCommand(TimeParametersCommand.Set)
export class TimeParametersCCSet extends TimeParametersCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| TimeParametersCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 7);
			this.year = this.payload.readUInt16BE(0);
			this.month = this.payload[2];
			this.day = this.payload[3];
			this.hour = this.payload[4];
			this.minute = this.payload[5];
			this.second = this.payload[6];
		} else {
			// TODO: enforce limits
			this.year = options.year;
			this.month = options.month;
			this.day = options.day;
			this.hour = options.hour;
			this.minute = options.minute;
			this.second = options.second;
		}
	}

	public year: number;
	public month: number;
	public day: number;
	public hour: number;
	public minute: number;
	public second: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			// 2 bytes placeholder for year
			0,
			0,
			this.month,
			this.day,
			this.hour,
			this.minute,
			this.second,
		]);
		this.payload.writeUInt16BE(this.year, 0);
		return super.serialize();
	}
}