// Copyright 2023, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
                continue;
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