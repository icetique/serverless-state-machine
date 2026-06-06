import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { AgreementDomainEvent } from './events';

export type EventPublisherMode = 'local' | 'eventbridge';

export interface EventPublisher {
    publish(event: AgreementDomainEvent): Promise<void>;
}

export class LocalLogPublisher implements EventPublisher {
    async publish(event: AgreementDomainEvent): Promise<void> {
        console.log(
            JSON.stringify({
                message: `${event.detailType} event published locally`,
                event,
            }),
        );
    }
}

export class AwsEventBridgePublisher implements EventPublisher {
    constructor(
        private readonly client: Pick<EventBridgeClient, 'send'>,
        private readonly eventBusName: string,
    ) {}

    async publish(event: AgreementDomainEvent): Promise<void> {
        await this.client.send(
            new PutEventsCommand({
                Entries: [
                    {
                        EventBusName: this.eventBusName,
                        Source: event.source,
                        DetailType: event.detailType,
                        Detail: JSON.stringify(event.detail),
                    },
                ],
            }),
        );
    }
}

export const getEventPublisherMode = (): EventPublisherMode => {
    const mode = process.env.EVENT_PUBLISHER_MODE ?? 'local';

    if (mode !== 'local' && mode !== 'eventbridge') {
        throw new Error(`Unsupported EVENT_PUBLISHER_MODE: ${mode}`);
    }

    return mode;
};

export const getEventBusName = (): string => process.env.EVENT_BUS_NAME ?? 'default';
