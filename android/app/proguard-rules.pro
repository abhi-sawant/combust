# kotlinx.serialization keeps its own generated serializers; these cover annotation reflection.
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault
-keep @interface kotlinx.serialization.SerialName

# OkHttp ships its own consumer rules; silence optional TLS providers it probes for.
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
