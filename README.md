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

### :book: Image-Resize 구성도

|![image-resize-architecture](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/Image-resize.png?raw=true)|
| :----------------------------------: |
| AWS CloudFront, Lambda@Edge, S3 구성도 |

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

* **Restrict Bucket Access**

    * 현재 S3 버킷은 공개된 버킷이 아닙니다. S3 URL을 브라우저에 입력해도 이미지가 나오지 않습니다.

    * CloudFront URL만 허용하려고 했기 때문에 반드시 이 설정을 해줘야 합니다.

    * `Restrict Bucket Access`을 yes로 선택합니다.

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
                    "AWS": "arn:aws:iam::cloudfront:user/{YOUR_ORIGIN_ACCESS_IDENTITY}"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::hyodol-image-resizing/*"
            },
        ]
    }
    ```

<br>

### :book: Query String Forwarding and Caching

* CloudFront의 기본 옵션은 Query String을 허용하지 않는다. 이를 통해서 캐싱 능력을 향상 시키는 것이다.

* 하지만 사용자는 원본 이미지를 리사이징하여 출력되기를 원하기 때문에 Query String을 통해 리사이즈에 관련된 옵션들을 전달받아야 한다. (Query String을 통한 전달 방법 이외에 다른 방법이 있을 수도 있다.)

* 우선 `CloudFront Distributions`에서 편집하고자 하는 ID를 클릭하면 아래와 같은 화면이 나온다.

|![edit](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/cloudfront-edit.png?raw=true)|
|:-:|
| CloudFront ID를 클릭하고 나서 Behaviors 탭을 누른 화면 |

* `Behaviors` 탭을 눌러 편집하고자 하는 Item을 누른 후, Edit을 누르면 아래와 같은 화면이 나온다.

|![behaviors](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/edit-behavior.png?raw=true)|
|:-:|
| Query String 관련 옵션 설정하는 화면 |

* **Query String Forwarding and Caching**

    * `Query String Forwarding and Caching` 옵션에서 `Forward all, cache base on whitelist`를 선택합니다.

* **Query String Whitelist**

    * `Query String Whitelist` 에서 추가하고자 하는 Query String을 추가하면 된다.

<br>

### :bookmark: 참고

* [AWS CloudFront](https://aws.amazon.com/ko/cloudfront/)

* [AWS Lambda@Edge](https://aws.amazon.com/ko/lambda/edge/)

* [AWS Lambda@edge로 실시간 이미지 리사이징](https://heropy.blog/2019/07/21/resizing-images-cloudfrount-lambda/)

* [AWS Lambda@Edge에서 실시간 이미지 리사이즈 & WebP 형식으로 변환](https://medium.com/daangn/lambda-edge로-구현하는-on-the-fly-이미지-리사이징-f4e5052d49f3)

* [람다 엣지로 이미지 리사이징 (1) - s3와 클라우드 프론트 설정](https://afrobambacar.github.io/2018/12/image-resizing-with-lambda-edge.html)

* [람다 엣지로 이미지 리사이징 (2) - 람다 엣지 작성과 연결](https://afrobambacar.github.io/2018/12/image-resizing-with-lambda-edge-2.html)

* [Resizing Images with Amazon CloudFront & Lambda@Edge | AWS CDN Blog](https://aws.amazon.com/ko/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/)