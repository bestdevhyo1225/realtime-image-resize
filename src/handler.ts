import querystring from 'querystring';
import sharp from 'sharp';
import aws from 'aws-sdk';

const s3: object = new aws.S3({ region: 'ap-northeast-2' });

const supportImageTypes: string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'tiff'];

interface Event {
    body: string;
}

type CallbackFunc = (error: Error, response: Response) => void;

export const handler = async(event: Event, context: object, callback: CallbackFunc): Promise<void> => {

}