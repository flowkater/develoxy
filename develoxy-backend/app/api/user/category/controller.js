const models = require('./../../../models/index');
const Joi = require('joi');

module.exports = {
    get: async (ctx, next) => {
        const userId = ctx.request.userId;
        try {
            const category = await models.Category.findByUserId(userId);

            ctx.body = {
                category
            };
        } catch (e) {
            console.log(e);
            ctx.status = 400;
            ctx.body = {
                message: 'error occurred'
            };
        }
    },
    create: async (ctx, next) => {

        // 스키마 검사
        const schema = {
            name: Joi.string().required()
        };

        const validate = Joi.validate(ctx.request.body, schema);
        if(validate.error) {
            ctx.status = 400;
            ctx.body = {
                message: 'validation failure'
            }
            return;
        }

        const { name } = ctx.request.body;
        const userId = ctx.request.userId;

        try {
            const count = await models.Category.countBaseLeaves(userId);

            await models.Category.create({
                name,
                userId,
                index: count,
            });

            ctx.status = 201;
            
            const result = await models.Category.findByUserId(userId);

            ctx.body = {
                category: result
            };
            
        } catch (e) {
            console.log(e);
            ctx.status = 400;
            ctx.body = {
                message: 'error occurred'
            };
        }
    },
    move: async (ctx, next) => {

        // 스키마 검사

        const userId = ctx.request.userId;

        const schema = {
            id: Joi.number().required(),
            parentId: Joi.number().required(),
            index: Joi.number().required()
        };

        const validate = Joi.validate(ctx.request.body, schema);
        
        if(validate.error) {
            ctx.status = 400;
            ctx.body = {
                message: 'validation failure'
            }
            return;
        }

        try {
            const { id, parentId, index } = ctx.request.body;

            // 이전 정보 불러오기
            const prevInfo = await models.Category.findById(id);

            // 존재하지 않음
            if(!prevInfo) {
                ctx.status = 403;
                ctx.body = {
                    message: 'not found'
                }
                return;
            }

            if(prevInfo.userId !== userId) {
            // 본인의 카테고리가 아님
                ctx.status = 401;
                ctx.body = {
                    message: 'different userId'
                }
                return;
            }

            // ParentId 가 바뀜
            if(prevInfo.parentId !== parentId) {

                // 기존 아이템 하단에 있는 아이템 검색
                const itemsBelow = await models.Category.findAll({
                    where: {
                        parentId: prevInfo.parentId,
                        index: { $gt: prevInfo.index }
                    }
                });
                
                // parentId 가 0 임
                if(parentId !== 0) {
                    const parent = await models.Category.findById(parentId);

                    // 존재하지 않는 부모
                    if(!parent) {
                        ctx.status = 400;
                        ctx.body = {
                            message: 'invalid parent'
                        }
                        return;
                    }

                    // 부모 카테고리가 남의꺼
                    if(parent.userId !== userId) {
                        ctx.status = 401;
                        ctx.body = {
                            message: 'parent has different userId'
                        }
                        return;
                    }
                }
                

                // 자식 갯수를 센다
                const childrenCount = await models.Category.countChildren({parentId, userId});

                // index 가 자식 수 보다 많으면 에러
                if(index>childrenCount) {
                    ctx.status = 400;
                    ctx.body = {
                        message: 'invalid child index'
                    };
                    return;
                }


                // 위로 올린다
                if(itemsBelow) {

                    // Promise 배열 생성
                    const p = itemsBelow.map(
                        (item) => item.moveUp()
                    );

                    // 다 기다림
                    await Promise.all(p);
                }

                // 이동될 아이템 위치 + 하단에 있는 아이템들 검색
                const itemsBelowNewLoc =  await models.Category.findAll({
                    where: {
                        parentId,
                        index: { $gte: index }
                    }
                });

                // 아래로 내린다
                if(itemsBelowNewLoc) {
                    // Promise 배열 생성
                    const p = itemsBelowNewLoc.map(
                        (item) => item.moveDown()
                    );

                    // 다 기다림
                    await Promise.all(p);
                }
            } else {
            // index 만 바뀐 경우임

                // index 가 아래로 내려간 경우
                if(index > prevInfo.index) {

                    // 기존 위치 ~ 새위치 (포함) 사이의 아이템들 찾기
                    const itemsBetween = await models.Category.findAll({
                        where: {
                            parentId,
                            $and: [
                                { index: { $gt: prevInfo.index } },
                                { index: { $lte: index } }
                            ]
                        }
                    });

                    // 위로 올린다
                    if(itemsBetween) {
                        // promise 배열 생성
                        const p = itemsBetween.map(
                            (item) => item.moveUp()
                        );

                        // 다 기다린다
                        await Promise.all(p);
                    }
                } else {
                    // 위로 올라간경우

                    // 새 위치 (포함) 부터 이전위치 사이의 아이템들 찾기
                    const itemsBetween = await models.Category.findAll({
                        where: {
                            parentId,
                            $and: [
                                { index: { $gte: index } },
                                { index: { $lt: prevInfo.index } }
                            ]
                        }
                    });

                    // 아래로 내린다
                    if(itemsBetween) {
                        // promise 배열 생성
                        const p = itemsBetween.map(
                            (item) => item.moveDown()
                        );

                        // 다 기다린다
                        await Promise.all(p);
                    }
                }
            }

            // 아이템 업데이트
            prevInfo.index = index;
            prevInfo.parentId = parentId;
            await prevInfo.save();

            const category = await models.Category.findByUserId(userId);

            ctx.body = {
                category
            };

        } catch (e) {
            console.log(e);
            ctx.status = 400;
            ctx.body = {
                message: 'error occurred'
            };
        }
    },
    delete: async (ctx, next) => {
        const userId = ctx.request.userId;

        // 스키마 검사
        const schema = { 
            id: Joi.number().required() 
        };

        const id = ctx.params.id;

        const validate = Joi.validate({
            id
        }, schema);
        

        if(validate.error) {
            ctx.status = 400;
            ctx.body = {
                message: 'validation failure'
            }
            return;
        }

        // 해당 카테고리 가져오기
        try {
            const category = await models.Category.findById(id);

            // 카테고리 존재유무 체크
            if(!category) {
                ctx.status = 403;
                ctx.body = {
                    message: 'not found'
                }
                return;
            }

            // 카테고리 본인껀지 체크
            if(category.userId !== userId) {
                ctx.status = 401;
                ctx.body = {
                    message: 'different userId'
                }
                return;
            }

            const { parentId, index } = category;

            // 자식들이 있다면,  자기 자신의 자식들을 자신의 parent 로 설정

            const children = await models.Category.findByParentId(id);
            
            const count = await models.Category.countChildren({
                userId,
                parentId
            });

            // parentId 와 index 를 바꾼다
            // index 는 parent 의 자식 count + i 번째
            // 즉 기존 카테고리의 하단에 위치하게 된다는 말.

            if(children.length > 0) {
                const p = children.map(
                    (child, i) => { 
                        child.parentId = parentId;
                        child.index = count + i;
                        return child.save();
                    }
                );

                // 다 기다린다.
                await Promise.all(p);
            }

            // 자기 하단에 카테고리 
            const itemsBelow = await models.Category.findAll({
                where: {
                    parentId: parentId,
                    index: { $gt: index }
                }
            });

            if(itemsBelow.length > 0) {
                // 위로 올린다
                const p = itemsBelow.map(
                    item => item.moveUp()
                );

                // 다 기다린다
                await Promise.all(p);
            }

            // 마지막으로, 삭제
            await category.destroy();


            const result = await models.Category.findByUserId(userId);

            ctx.body = {
                category: result
            };

        } catch(e) {
            ctx.status = 400;
            ctx.body = {
                message: 'error occurred'
            };
        }
        
    },

    rename: async (ctx, next) => {
        const userId = ctx.request.userId;

        const schema = {
            id: Joi.number().required(),
           name: Joi.string().required()
        };

        const validate = Joi.validate(ctx.request.body, schema);
        
        if(validate.error) {
            ctx.status = 400;
            ctx.body = {
                message: 'validation failure'
            }
            return;
        }
        
        const { id, name } = ctx.request.body;

        try {
            const category = await models.Category.findById(id);

            // 카테고리 존재유무 체크
            if(!category) {
                ctx.status = 403;
                ctx.body = {
                    message: 'not found'
                }
                return;
            }

            // 카테고리 본인껀지 체크
            if(category.userId !== userId) {
                ctx.status = 401;
                ctx.body = {
                    message: 'different userId'
                }
                return;
            }

            await category.rename(name);

            const result = await models.Category.findByUserId(userId);

            ctx.body = {
                category: result
            };

        } catch(e) {
            ctx.status = 400;
            ctx.body = {
                message: 'error occurred'
            };
        }



    }
}