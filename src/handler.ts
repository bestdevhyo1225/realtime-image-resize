import { Event, CallbackFunc, Response } from './handler_params';

import querystring from 'querystring';
import sharp from 'sharp';
import aws, { S3 } from 'aws-sdk';

enum StatusCode {
    OK          = 200,
    FORBIDDEN   = 403,
    NOT_FOUND   = 404,
}

const s3: any = new aws.S3({ region: 'ap-northeast-2' });

const supportImageTypes: string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'tiff'];

export const handler = async (event: Event, context: object, callback: CallbackFunc): Promise<void> => {
    const { request, response } = event.Records[0].cf;

    const bucket: string = 'hyodol-image-resizing';

     // check if image is present and not cached.
    if (response.status === StatusCode.OK) {
        const params: { [key: string]: any } = querystring.parse(request.querystring);

         // If none of the s, t, or q variables is present, just pass the request
        if (!params.s || !params.t || !params.q) {
            return callback(null, response);
        }

        // read the S3 key from the path variable.
        // assets/images/sample.jpeg
        const key: string = decodeURIComponent(request.uri).substring(1);
        
        // s=100x100&t=crop&q=100(&f=webp)
        const sizeMatch:    string[] = params.s.split('x');
        const typeMatch:    string   = params.t;
        const qualityMatch: string   = params.q;
        const formatMath:   string   = params.f;

        let originalFormat: string = key.match(/(.*)\.(.*)/)[2].toLowerCase();

        if (!supportImageTypes.some((type: string): boolean => { return type === originalFormat })) {
            updateResponse({
                status            : StatusCode.FORBIDDEN,
                statusDescription : 'Forbidden',
                contentHeader     : [{ key: 'Content-Type', value: 'text/plain' }],
                body              : 'Unsupported image type',
            });
            return callback(null, response);
        }

        let width:   number = parseInt(sizeMatch[0], 10);
        let height:  number = parseInt(sizeMatch[1], 10);
        let type:    string = typeMatch === 'crop' ? 'cover' : typeMatch;
        let quality: number = parseInt(qualityMatch, 10);

        // correction for jpg required for 'Sharp'
        originalFormat = originalFormat === 'jpg' ? 'jpeg' : originalFormat;
        let requiredFormat: string = formatMath === 'webp' ? 'webp' : originalFormat;

        try {
            const s3Object: any = await s3.getObject({ Bucket: bucket, Key: key }).promise();

            if (s3Object.ContentLength === 0) {
                updateResponse({
                    status            : StatusCode.NOT_FOUND,
                    statusDescription : 'Not Found',
                    contentHeader     : [{ key: 'Content-Type', value: 'text/plain' }],
                    body              : 'The image does not exist.',
                });
                return callback(null, response);
            }

            if (requiredFormat !== 'jpeg' && requiredFormat !== 'webp' && requiredFormat !== 'png' && requiredFormat !== 'tiff') {
                requiredFormat = 'jpeg';
            }

            let metaData: any, resizedImage: any, bytelength: number = 0;

            // 응답의 Body를 조작하는데, 크기는 1MB = 1046528byte 이하여야 한다.
            // 이미지의 크기를 한 번 조절했을 때 1MB를 넘는 경우를 대처해야 한다.
            // 응답을 조작하지 않는다면 1MB 이상의 응답이 가능하다.
            while (true) {
                resizedImage = await sharp(s3Object.body).rotate();
                metaData     = await resizedImage.metadata();

                if (metaData.width > width || metaData.height > height) {
                    resizedImage.resize(width, height, { fit : type });
                }

                if (bytelength >= 1046528 || originalFormat !== requiredFormat) {
                    resizedImage.format(requiredFormat, { quality : quality });
                }

                resizedImage = await resizedImage.toBuffer();
                bytelength = Buffer.byteLength(resizedImage, 'base64');

                if (bytelength >= 1046528) {
                    quality -= 10;
                } else {
                    break;
                }
            }

            updateResponse({
                status            : StatusCode.OK,
                statusDescription : 'OK',
                contentHeader     : [{ key: 'Content-Type', value: `image/${requiredFormat}` }],
                cacheControl      : [{ key: 'cache-control', value: 'max-age=31536000' }],
                body              : resizedImage.toString('base64'),
                bodyEncoding      : 'base64',
            });
            return callback(null, response);
        } catch (error) {
            console.error(error);
            return callback(error);
        }
    } else {
        // allow the response to pass through
        return callback(null, response);
    }

    function updateResponse(newResponse: Response): void {
        response.status = newResponse.status;
        response.statusDescription = newResponse.statusDescription;
        response.headers['content-type'] = newResponse.contentHeader;
        response.body = newResponse.body;
        if (newResponse.bodyEncoding) {
            response.bodyEncoding = newResponse.bodyEncoding;
        }
        if (newResponse.cacheControl) {
            response.headers['cache-control'] = newResponse.cacheControl;
        }
    }
}