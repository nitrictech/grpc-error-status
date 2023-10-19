import type { Message } from "google-protobuf";
import type { ServiceError } from "@grpc/grpc-js";
import { Status } from './google/rpc/status_pb';

class StatusWrapper {
    public readonly status: Status;

    constructor(status: Status) {
        this.status = status;
    }

    parseDetails = <T extends Message = Message>(deserializer: BinaryDeserializer<T>): T[] => {
        const details = this.status.getDetailsList();
        let foundDetails: T[] = [];

        for (let detail of details) {
            try {
                const unpacked = detail.unpack(deserializer.deserializeBinary, detail.getTypeName());
                if (unpacked && unpacked !== null) {
                    foundDetails = [...foundDetails, unpacked];
                }
            } catch (e) {
                // ignore not found we're only searching for a specific type
            }
        }

        return foundDetails;
    }
}

interface BinaryDeserializer<T extends Message> {
    deserializeBinary(bytes: Uint8Array): T;
}

export const parse = (e: ServiceError): StatusWrapper | undefined => {
    const detailsMap = e.metadata.getMap();

    const statusDetailsBin = detailsMap['grpc-status-details-bin'];

    if (!statusDetailsBin) {
        return
    }

    const status = Status.deserializeBinary(statusDetailsBin as Buffer);

    return new StatusWrapper(status);
}