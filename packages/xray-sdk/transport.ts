import { XRayEvent } from "../xray-core/types";

export interface Transport {
    send(events: XRayEvent[]): Promise<void>;
}

export class HttpTransport implements Transport {
    constructor(private eventsUrl: string) { }

    async send(events: XRayEvent[]): Promise<void> {
        if (events.length === 0) return;

        try {
            const res = await fetch(this.eventsUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(events),
            });
            if (!res.ok) {
                const text = await res.text();
                console.error(`XRay Transport Failed: ${res.status} ${res.statusText}`, text);
            } else {
                // console.log("XRay Transport Sent", events.length, "events");
            }
        } catch (err) {
            console.error("XRay Transport Error:", err);
            // Best effort: drop events if fail
            // In strict mode we might retry, but V1 is best effort.
        }
    }
}
