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

|![image-resize-architecture](https://github.com/bestdevhyo1225/realtime-image-resize/blob/master/image/bucket-policy.png?raw=true)|
| :-----------------------------: |
| 나중에 편집할 버킷정책(Bucket Policy) |

<br>

### :book: AWS CloudFront 배포 만들기



<br>

### :bookmark: 참고

* [AWS CloudFront](https://aws.amazon.com/ko/cloudfront/)

* [AWS Lambda@Edge](https://aws.amazon.com/ko/lambda/edge/)

* [AWS Lambda@edge로 실시간 이미지 리사이징](https://heropy.blog/2019/07/21/resizing-images-cloudfrount-lambda/)

* [AWS Lambda@Edge에서 실시간 이미지 리사이즈 & WebP 형식으로 변환](https://medium.com/daangn/lambda-edge로-구현하는-on-the-fly-이미지-리사이징-f4e5052d49f3)

* [람다 엣지로 이미지 리사이징 (1) - s3와 클라우드 프론트 설정](https://afrobambacar.github.io/2018/12/image-resizing-with-lambda-edge.html)

* [람다 엣지로 이미지 리사이징 (2) - 람다 엣지 작성과 연결](https://afrobambacar.github.io/2018/12/image-resizing-with-lambda-edge-2.html)

* [Resizing Images with Amazon CloudFront & Lambda@Edge | AWS CDN Blog](https://aws.amazon.com/ko/blogs/networking-and-content-delivery/resizing-images-with-amazon-cloudfront-lambdaedge-aws-cdn-blog/)