## AWS CloudFront의 Lambda@Edge로 실시간 이미지 리사이즈 구현하기

<br>

### :book: AWS CloudFront란?

* 빠른 전송 속도로 데이터, 동영상, 애플리케이션 및 API를 전 세계 고객에게 안전하게 전송하는 고속 콘텐츠 전송 네트워크(CDN, Contents Delivery Network) 서비스입니다.

<br>

### :book: Lambda@Edge란?

* AWS CloudFront의 기능 중 하나로서 애플리케이션의 사용자에게 더 가까운 위치에서 코드를 실행하여 성능을 개선하고 지연 시간을 단축할 수 있게 해 줍니다.

* 전 세계 여러 위치에 있는 인프라를 [프로비저닝](https://ko.wikipedia.org/wiki/%ED%94%84%EB%A1%9C%EB%B9%84%EC%A0%80%EB%8B%9D)하거나 관리하지 않아도 됩니다.

* AWS CloudFront에 의해 생성된 이벤트에 대한 응답으로 코드를 실행합니다.

<br>

### :book: Image-Resizing 전체 구성도

|![image-resize-architecture](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/Image-resize.png?raw=true)|
| :----------------------------------: |
| AWS CloudFront, Lambda@Edge, S3를 사용한 Image-Resizing |

<br>

### :book: S3 Bucket 생성하기

* 저는 `hyodol-image-resizing` 이라는 Bucket을 만들었습니다.

* 나중에 버킷정책(Bucket Policy)에서 CloudFront 와 Lambda 함수가 접속할 수 있도록 권한을 열어주도록 편집할 예정이고, 우선은 버킷만 만듭니다. 그리고 나서 테스트할 이미지 하나를 업로드 하시면 됩니다.

|![s3-bucket-policy](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/bucket-policy.png?raw=true)|
| :-----------------------------: |
| 나중에 편집할 버킷정책(Bucket Policy) |

<br>

### :book: AWS CloudFront 배포 만들기

* S3와 연결할 CloudFront는 다음과 같은 설정으로 배포를 만들면 됩니다.

* 우선 Create Distribution을 누르고, Web의 Get Started를 누릅니다. (RTMP는 아직 잘 모르겠습니다.)

* 아래와 같은 화면에서 설정을 시작하면 됩니다.

|![cloudfront-deploy-config](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/create-distribution.png?raw=true)|
| :------------------------------: |
| CloudFront 배포를 만들기 위한 설정 화면 |

* **Origin Domain Name**

    * `Origin Domain Name`은 방금 생성한 S3 도메인을 선택합니다.

* **Compress Objects Automatically**

    * `Compress Objects Automatically`를 `Yes`로 선택합니다. (압축하는 옵션입니다.)

* **Restrict Bucket Access**

    * 현재 S3 버킷은 공개된 버킷이 아닙니다. S3 URL을 브라우저에 입력해도 이미지가 나오지 않습니다.

    * CloudFront URL만 허용하려고 했기 때문에 반드시 이 설정을 해줘야 합니다.

    * `Restrict Bucket Access`을 `Yes`로 선택합니다.

* **Origin Access Identity**

    * `Origin Access Identity` 항목에서 `Create a New Identity`를 선택합니다.

* **Grant Read Permissions on Bucket**

    * `Grant Read Permissions on Bucket` 항목에서 `Yes, Update Bucket Policy`를 선택합니다.

    * S3 버킷으로 돌아가서 버킷정책을 확인해보면 자동으로 정책이 추가되었음을 확인할 수 있습니다.

    ```json
    {
        "Version": "2008-10-17",
        "Id": "PolicyForCloudFrontPrivateContent",
        "Statement": [
            {
                "Sid": "1",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::cloudfront:user/사용자의 ORIGIN_ACCESS_IDENTITY"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::hyodol-image-resizing/*"
            },
        ]
    }
    ```

<br>

### :book: Query String Forwarding and Caching

* CloudFront의 기본 옵션은 Query String을 허용하지 않습니다. 이를 통해서 캐싱 능력을 향상 시키는 것입니다.

* 하지만 사용자는 원본 이미지를 리사이징하여 출력되기를 원하기 때문에 Query String을 통해 리사이즈에 관련된 옵션들을 전달받아야 합니다. (Query String을 통한 전달 방법 이외에 다른 방법이 있을 수도 있습니다.)

* 우선 `CloudFront Distributions`에서 편집하고자 하는 ID를 클릭하면 아래와 같은 화면이 나옵니다.

|![edit](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/cloudfront-edit.png?raw=true)|
|:-:|
| CloudFront ID를 클릭하고 나서 Behaviors 탭을 누른 화면 |

* `Behaviors` 탭을 눌러 편집하고자 하는 Item을 누른 후, Edit을 누르면 아래와 같은 화면이 나옵니다.

|![behaviors](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/edit-behavior.png?raw=true)|
|:-:|
| Query String 관련 옵션 설정하는 화면 |

* **Query String Forwarding and Caching**

    * `Query String Forwarding and Caching` 옵션에서 `Forward all, cache base on whitelist`를 선택합니다.

* **Query String Whitelist**

    * `Query String Whitelist` 에서 추가하고자 하는 Query String을 추가하면 됩니다.

<br>

### :book: IAM 정책 생성

* 정책 생성을 선택합니다.

* `JSON`탭을 클릭하여 아래와 같은 인라인 정책을 작성합니다.

* 저는 정책 이름을 `EdgeLambdaRole`로 했습니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "lambda:GetFunction",
                "lambda:EnableReplication",
                "iam:CreateServiceLinkedRole",
                "cloudfront:UpdateDistribution",
                "s3:GetObject"
            ],
            "Resource": "*",
            "Effect": "Allow"
        }
    ]
}
```

<br>

### :book: IAM 역할 만들기

* 역할 만들기를 선택합니다.

* `Lambda` 서비스를 선택합니다.

* 정책 필터에서 `EdgeLambdaRole` 정책을 검색한 후 추가합니다.

* `Lambda` 함수가 `Cloud Watch`에 로그를 쌓을 수 있도록 허용하는 `AWSLambdaBasicExecutionRole` 관리 정책을 추가합니다.

* 저는 역할 이름을 똑같이 `EdgeLambdaRole`로 했습니다.

* 역할을 완성하려면 `신뢰 관계(Trust relationships)`탭에서 `신뢰 관계 편집(Edit Trust Relationships)`을 선택합니다.

* `edgelambda.amazonaws.com`과 `edgelambda.amazonaws.com`을 추가합니다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "edgelambda.amazonaws.com",
          "lambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

* 마지막으로 `S3`에서 하나를 더 설정해야 합니다.

* `Lambda`가 `S3`에 접근할 권한을 가졌다고 하더라도 `S3`버킷에 해당 정책이 들어있지 않으면 권한이 없다는 메시지를 출력합니다.

* `EdgeLambdaRole`이 `S3`버킷에서 잘 동작할 수 있도록 `S3`의 버킷 정책을 편집해야 합니다.

```json
{
    "Version": "2008-10-17",
    "Id": "PolicyForCloudFrontPrivateContent",
    "Statement": [
        {
            "Sid": "1",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::cloudfront:user/사용자의 ORIGIN_ACCESS_IDENTITY"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::hyodol-image-resizing/*"
        },
        {
            "Sid": "2",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::사용자의 계정번호:role/EdgeLambdaRole"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::hyodol-image-resizing/*"
        }
    ]
```

<br>

### :book: Docker 이미지를 통한 sharp 모듈 빌드

* Sharp 모듈을 사용하기 위해서는 `Lambda` 실행 환경에서 빌드를 해야합니다.

* AWS에서는 `Lambda` 실행 환경을 Docker로 만들어 놨습니다. (정확히 말하자면 아마존 리눅스 AMI를 Docker로 제공하는 것)

* 아래의 `Dockerfile`은 Amazon Linux를 가져와서 nvm(node version manager)를 설치하고, NodeJS 10.x을 설치합니다.

```dockerfile
FROM amazonlinux:1

WORKDIR /tmp

RUN yum -y install gcc-c++ && yum -y install findutils

RUN touch ~/.bashrc && chmod +x ~/.bashrc

RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

RUN source ~/.bashrc && nvm install 10

WORKDIR /build
```

* `Dockerfile`이 있는 위치에서 아래 명령어를 통해 빌드를 하여 Docker 이미지를 만듭니다.

``` bash
$ docker build --tag amazonlinux:nodejs .
```

* 그 다음 sharp 모듈을 빌드 해야합니다. 아래 명령어는 Docker 인스턴스에서 빌드한 결과물을 볼륨 마운트를 통해 Docker 밖으로 결과물을 만들어 냅니다. 즉, 명령어를 실행하는 위치에 node_modules를 만듭니다.

* sharp 모듈을 빌드할 때 주의사항은 다음과 같습니다.

    * node_modules 디렉터리에 있는 sharp 바이너리는 linux-x64 플랫폼용으로 설정되어야 하기 때문에 `npm install --arch=x64 --platform=linux --target=10.15.0 sharp --save` 형식으로 모듈을 설치해야 합니다.

```bash
$ docker run --rm --volume ${PWD}:/build amazonlinux:nodejs /bin/bash -c "source ~/.bashrc; npm init -f -y; npm install --arch=x64 --platform=linux --target=10.15.0 sharp --save; npm install querystring --save; npm install --only=prod"
```

<br>

### :book: Image Resize 작업을 수행하는 Lambda@Edge 함수 만들기

* `Lambda` 함수를 작성하기 이전에 전체적인 흐름도는 다음과 같습니다.

    1. 사용자가 `CloudFront`에 이미지를 요청합니다.

    2. `CloudFront`에 이미지를 요청했으나 캐싱되어 있지 않습니다.

    3. `CloudFront`가 연결된 S3 버킷에 요청을 합니다.

    4. S3가 버킷에 이미지가 있는것을 확인하고 응답을 합니다.

    5. 람다 함수를 통해 원본 이미지를 리사이징 합니다.

    6. 리사이징한 이미지를 `CloudFront`에 캐싱 요청합니다.

    7. `CloudFront`는 이미지를 캐싱하고 사용자에게 이미지를 제공합니다.

* `CloudFront`는 4가지 이벤트 사이에 람다를 적용할 수 있습니다.

    |<img src="https://d2908q01vomqb2.cloudfront.net/5b384ce32d8cdef02bc3a139d4cac0a22bb029e8/2018/02/01/1.png" width="800" height="300">|
    |:--:|
    | CloudFront의 전체적인 흐름도 |

    * **Viewer Request**

    * **Viewer Response**

    * **Origin Request**

    * **Origin Response**

* 이 4가지 이벤트중에서 람다 함수가 위치하는 곳은 `Origin Response` 입니다.

* `Lambda@Edge` 함수는 TypeScript로 작성했고, 소스 코드는 아래 링크를 확인하시면 됩니다.

    * [handler.ts](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/src/handler.ts)

    * [handler-params.ts](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/src/handler-params.ts)

* [AWS Lambda@Edge에서 실시간 이미지 리사이즈 & WebP 형식으로 변환](https://medium.com/daangn/lambda-edge로-구현하는-on-the-fly-이미지-리사이징-f4e5052d49f3)에서 **Lambda@Edge의 제한사항**을 참고했습니다.

<br>

### :book: Lambda@Edge 함수 배포하기

* `Lambda`함수 등록을 위해 `serverless` 프레임워크를 사용했습니다.

* `serverless` 프레임워크는 yml을 통해 AWS Lambda에 함수 업로드를 도와주는 프레임워크이고, CLI를 사용해서 업로드 할 수 있습니다.

*  `serverless`를 설정하는 과정은 생략하겠습니다. 아래의 링크를 참고하셔서 공부하시면 serverless에 대해 알 수 있습니다.

    * [서버리스 아키텍쳐(Serverless)란?](https://velopert.com/3543)

    * [AWS Lambda 로 하는 Hello World!](https://velopert.com/3546)

    * [Serverless 프레임워크로 서버리스 애플리케이션 생성 및 배포하기](https://velopert.com/3549)

    * [Serverless 활용하기: MongoDB 기반 RESTful CRUD API 만들기](https://velopert.com/3577)

* `serverless.yml` 파일에 설정된 내용은 다음과 같습니다.

```yaml
service: image-resizing

custom:
    bucketName: 버킷 이름

# Lambda@Edge는 us-east-1에 배포해야 합니다.
provider:
    name: aws
    runtime: nodejs10.x
    region: us-east-1
    endPointType: Edge
    timeout: 30

functions:
    imageResize:
        role: arn:aws:iam::사용자의 계정번호:role/EdgeLambdaRole
        handler: dist/handler.handler
        package:
        include:
            - node_modules/**
            - dist/handler.js
```
    
* `Lambda`에 업로드 하려면 아래의 명령어를 입력합니다.

```bash
$ serverless deploy
```

<br>

### :book: CloudFront에 Lambda@Edge 함수 연결하기

* `CloudFront`에서 Behaviors 탭을 누릅니다.

* Lambda Function Associations 항목에서 CloudFront Event를 Origin Response로 선택합니다.

* 그 다음 Lambda Function ARN을 입력해야 하는데요 주의할 사항은 Lambda의 Version이 포함된 ARN을 입력해야 합니다.

    * 버전 값을 확인하는 방법은 `Lambda` 함수로 들어가서 구분자(Qualifiers)를 클릭하면 Version을 확인할 수 있습니다.

* 구분자(Qualifiers)에서 $LATEST 라는 값이 있습니다. 이 값은 `CloudFront`에 등록하는 `Lambda` 함수 ARN으로 사용할 수 없습니다.

    * Why????
    
    * `Lambda` 함수가 갱신되는 경우에 새로운 함수를 적용하기 위해서 `CloudFront`에 수동으로 함수를 연결해야 하는 번거로움이 있기 때문입니다.

<br>

### :book: Lambda@Edge 함수에 CloudFront 트리거 등록

* `CloudFront`에 이벤트를 연결했어도 아직 자동으로 `Lambda` 함수가 갱신되지 않는경우에는 수동으로 해줘야 합니다.

* 트리거 추가를 클릭하고 트리거 구성에서 `CloudFront`를 선택합니다.

* CloudFront 이벤트 항목에서 Origin Response로 선택한 후, 추가하면 됩니다.

### :book: Lambda 함수 테스트

* Lambda 함수 내부에서 오른쪽 상단에 테스트 버튼이 있습니다.

* 테스트 버튼을 클릭한 후, 이벤트 이름을 정합니다.

* JSON 내부에는 아래와 같이 작성하여 테스트를 진행했습니다. ([Lambda@Edge 이벤트 구조 - 응답 이벤트](https://docs.aws.amazon.com/ko_kr/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#lambda-event-structure-response))

```json
{
  "Records": [
    {
      "cf": {
        "config": {
          "distributionDomainName": "{본인 CloudFront의 Domain name}",
          "distributionId": "{본인 CloudFront의 ID}",
          "eventType": "origin-response",
          "requestId": "xGN7KWpVEmB9Dp7ctcVFQC4E-nrcOcEKS3QyAez--06dV7TEXAMPLE=="
        },
        "request": {
          "clientIp": "2001:0db8:85a3:0:0:8a2e:0370:7334",
          "method": "GET",
          "uri": "/sample.png",
          "querystring": "s=256x256&f=webp",
          "headers": {
            "host": [
              {
                "key": "Host",
                "value": "{본인 CloudFront의 Domain name}"
              }
            ],
            "user-agent": [
              {
                "key": "User-Agent",
                "value": "curl/7.18.1"
              }
            ]
          }
        },
        "response": {
          "status": "200",
          "statusDescription": "OK",
          "headers": {
            "server": [
              {
                "key": "Server",
                "value": "MyCustomOrigin"
              }
            ],
            "set-cookie": [
              {
                "key": "Set-Cookie",
                "value": "theme=light"
              },
              {
                "key": "Set-Cookie",
                "value": "sessionToken=abc123; Expires=Wed, 09 Jun 2021 10:18:14 GMT"
              }
            ]
          }
        }
      }
    }
  ]
}
```

### :book: CloudFront Domain Name으로 접속해서 이미지 보기

* 저는 아래와 같은 URL로 접속했습니다. (sample2.jpg 이미지는 사전에 S3 버킷에 저장해놨습니다.)

```
https://{본인 CloudFront의 Domain Name}/sample2.jpg?s=256x256&f=webp
```

* **Cache - Miss from cloudfront**

|![1](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/Miss-from-cloudfront1.png?raw=true)|
| :--: |
| 처음 요청하는 경우에는 `Cache Miss` 이기 때문에 S3에 이미지를 요청하고, Lambda 함수를 통해 이미지를 리사이징한다. |

|![2](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/Miss-from-cloudfront2.png?raw=true)|
| :--: |
|  `169.76ms`의 시간이 소요된다. |

* **Cache - Hit from cloudfront**

|![1](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/Hit-from-cloudfront.png?raw=true)|
| :--: |
| `Cache Hit` 이면, CloudFront에서 캐싱된 이미지를 제공한다. |

|![2](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/Hit-from-cloudfront2.png?raw=true)|
| :--: |
|  `51.01ms`의 시간이 소요된다. |

<br>

### :book: 정리

우연히 [당근마켓 팀 블로그](https://medium.com/?daangn)를 보다가 직접 구현해보고 싶었습니다. AWS 서비스를 공부하고, 여러 자료를 찾아보고 삽질의 과정을 통해 구현할 수 있었습니다. 이 문서를 작성하는 이유는 누군가에게 이렇게 안내해주는 문서가 아니라 내가 까먹지 않고 나중에 복습하기 위해서 작성한 문서임을 참고해주시면 감사하겠습니다. 마지막으로 Linux, Shell-Script, Docker, AWS 서비스와 같은 백엔드 및 IT 인프라에 대해 끊임없이 공부해야 된다는 것을 느꼈습니다.

<br>

### :bookmark: 참고

* [Cloudcraft](https://cloudcraft.co/)

* [AWS CloudFront](https://aws.amazon.com/ko/cloudfront/)

* [AWS Lambda@Edge](https://aws.amazon.com/ko/lambda/edge/)

* [AWS Lambda@edge로 실시간 이미지 리사이징](https://heropy.blog/2019/07/21/resizing-images-cloudfrount-lambda/)

* [AWS Lambda@Edge에서 실시간 이미지 리사이즈 & WebP 형식으로 변환](https://medium.com/daangn/lambda-edge로-구현하는-on-the-fly-이미지-리사이징-f4e5052d49f3)

* [람다 엣지로 이미지 리사이징 (1) - s3와 클라우드 프론트 설정](https://afrobambacar.github.io/2018/12/image-resizing-with-lambda-edge.html)

* [람다 엣지로 이미지 리사이징 (2) - 람다 엣지 작성과 연결](https://afrobambacar.github.io/2018/12/image-resizing-with-lambda-edge-2.html)

* [Resizing Images with Amazon CloudFront & Lambda@Edge | AWS CDN Blog](https://aws.amazon.com/ko/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/)

* [Serverless Architecture란?](https://velopert.com/3543)