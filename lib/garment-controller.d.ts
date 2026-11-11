export class GarmentController {
 constructor(options?: {frameCount?:number;durationMs?:number;returnDurationMs?:number;endpointWindow?:number;onFrame?:(frame:number)=>void});
 frame:number;position:number;target:number;segment:unknown;velocity:number;
 setTarget(target:number,options?:{immediate?:boolean}):void;
 step(deltaMs:number):boolean;
}
